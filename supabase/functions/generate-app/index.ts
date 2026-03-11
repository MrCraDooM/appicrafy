import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Plan Config ──────────────────────────────────────────────────────────────
const PLAN_LIMITS: Record<string, number> = {
  free:    5,
  starter: 10,
  pro:     Infinity,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, projectId, projectName, fixMode, existingFiles, snackError } = body;

    // ── Auto-fix mode (no usage charge) ──────────────────────────────────────
    if (fixMode && existingFiles && snackError) {
      const isPaidPlan2 = (await supabase.from("user_usage").select("plan").eq("user_id", user.id).maybeSingle())
        ?.data?.plan === "pro";
      const fixedFiles = isPaidPlan2
        ? await generateWithOpenAI(buildFixPrompt(existingFiles, snackError))
        : await generateWithGemini(buildFixPrompt(existingFiles, snackError));

      if (projectId) {
        await supabase.from("projects")
          .update({ files: fixedFiles, screens: extractScreens(fixedFiles), last_generated_at: new Date().toISOString() })
          .eq("id", projectId).eq("user_id", user.id);
      }
      return new Response(
        JSON.stringify({ success: true, app: { id: projectId, files: fixedFiles, screens: extractScreens(fixedFiles) } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Server-side plan enforcement via user_usage ───────────────────────────
    let { data: usageData } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Bootstrap record for users who pre-date the table
    if (!usageData) {
      const { data: inserted } = await supabase
        .from("user_usage")
        .insert({
          user_id: user.id,
          plan: "free",
          generations: 0,
          monthly_limit: 5,
          reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      usageData = inserted;
    }

    if (!usageData) {
      return new Response(JSON.stringify({ error: "Could not load usage data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-reset monthly counter if reset_date has passed
    const now = new Date();
    if (new Date(usageData.reset_date) <= now) {
      const newReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: reset } = await supabase
        .from("user_usage")
        .update({ generations: 0, reset_date: newReset })
        .eq("user_id", user.id)
        .select()
        .single();
      if (reset) usageData = reset;
    }

    const plan: string = usageData.plan ?? "free";
    const limit = PLAN_LIMITS[plan] ?? 1;
    const generations: number = usageData.generations ?? 0;
    const isPro = plan === "pro";

    // Enforce limit server-side
    if (!isPro && generations >= limit) {
      return new Response(
        JSON.stringify({
          error: "LIMIT_REACHED",
          message: "You have reached your monthly limit of 5 generations. Upgrade your plan to generate more apps.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch user's custom Gemini API key (if set) ───────────────────────────
    const { data: userPlanData } = await supabase
      .from("user_plans")
      .select("gemini_api_key")
      .eq("user_id", user.id)
      .maybeSingle();
    const userGeminiKey = userPlanData?.gemini_api_key ?? null;

    // ── Generate: free → Gemini, paid → OpenAI ───────────────────────────────
    const isPaidPlan = plan === "starter" || plan === "pro";
    const generatedFiles = isPaidPlan
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt, userGeminiKey);

    const appName = extractAppName(prompt, projectName);
    const screens = extractScreens(generatedFiles);

    // ── Save / update project ─────────────────────────────────────────────────
    let savedProject;
    if (projectId) {
      const { data } = await supabase
        .from("projects")
        .update({
          files: generatedFiles,
          screens,
          description: prompt,
          last_generated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("user_id", user.id)
        .select()
        .single();
      savedProject = data;
    } else {
      const { data } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: appName,
          description: prompt,
          files: generatedFiles,
          screens,
          generations_count: 1,
          last_generated_at: new Date().toISOString(),
        })
        .select()
        .single();
      savedProject = data;
    }

    // ── Increment usage counter (server-side, authoritative) ─────────────────
    await supabase
      .from("user_usage")
      .update({ generations: generations + 1 })
      .eq("user_id", user.id);

    // Keep user_plans updated for backward compat
    await supabase
      .from("user_plans")
      .update({
        has_generated_free_app: true,
        last_generation_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        app: {
          id: savedProject?.id ?? `gen_${Date.now()}`,
          name: appName,
          description: prompt,
          files: generatedFiles,
          screens,
          generatedAt: new Date().toISOString(),
        },
        plan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-app error:", err);
    const message = err instanceof Error ? err.message : "Generation failed. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
// ─── AI Generators ───────────────────────────────────────────────────────────

async function generateWithGemini(prompt: string, customKey?: string | null) {
  const apiKey = customKey || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("AI service is not configured. Please contact support.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildSystemPrompt(prompt) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 32768 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      if (response.status === 403 || response.status === 400) throw new Error("Gemini API key is invalid or expired. Please contact support.");
      if (response.status === 429) throw new Error("AI quota exceeded. Please try again later.");
      throw new Error(`AI generation failed (${response.status}). Please try again.`);
    }

    const data = await response.json();
    // Gemini 2.5 is a thinking model — parts[0] may be the thought, parts[1] the actual response
    const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.find(p => !p.thought && p.text)?.text ?? parts[parts.length - 1]?.text ?? "";
    if (!text) {
      console.error("Gemini returned empty text, data:", JSON.stringify(data));
      throw new Error("AI returned an empty response. Please try again.");
    }
    return parseGeneratedFiles(text, prompt);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("AI service is not configured. Please contact support.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert React Native / Expo mobile app generator. Generate complete, working source code as valid JSON only. Return ONLY a valid JSON array with no markdown, no explanation, no code fences.",
        },
        { role: "user", content: buildSystemPrompt(prompt) },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error:", await response.text());
    throw new Error("AI generation failed. Please try again in a moment.");
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("AI returned an empty response. Please try again.");
  return parseGeneratedFiles(text, prompt);
}


// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildSystemPrompt(prompt: string): string {
  return `Generate a COMPLETE, RUNNABLE React Native + Expo mobile app for this idea:

"${prompt}"

STRICT OUTPUT RULES:
- Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
- Every file must have: "name", "path", "language", "content" fields.
- Use JAVASCRIPT ONLY. Do NOT use TypeScript. No .ts or .tsx files. Only .js files.

REQUIRED FILES (all mandatory):
1. App.js                         — entry point with NavigationContainer + Stack.Navigator
2. screens/HomeScreen.js          — main screen relevant to the app idea
3. screens/ (1-2 extra screens)   — relevant to the app idea
4. components/Header.js           — reusable header
5. components/ (1-2 components)   — relevant to the app
6. package.json                   — minimal deps, exact versions below
7. app.json                       — expo config with name/slug
8. babel.config.js                — Babel preset for Expo

PACKAGE.JSON DEPENDENCIES (use exactly these versions):
{
  "expo": "~50.0.0",
  "react": "18.2.0",
  "react-native": "0.73.6",
  "@react-navigation/native": "^6.0.0",
  "@react-navigation/native-stack": "^6.0.0",
  "react-native-screens": "~3.29.0",
  "react-native-safe-area-context": "4.8.2",
  "expo-status-bar": "~1.11.1"
}

CODE RULES:
- Pure JavaScript — no TypeScript, no type annotations, no interfaces, no generics
- Functional components with React hooks
- StyleSheet.create() for ALL styles — no inline style objects
- No external image URLs — use colors and text only
- Simple, clean code that works in Expo Snack web preview
- All imports must use relative paths

EXAMPLE OUTPUT FORMAT:
[
  {"name":"App.js","path":"App.js","language":"javascript","content":"import React from 'react';\\nimport ..."},
  {"name":"HomeScreen.js","path":"screens/HomeScreen.js","language":"javascript","content":"..."},
  {"name":"package.json","path":"package.json","language":"json","content":"..."}
]`;
}

function buildFixPrompt(files: any[], error: string): string {
  const filesSummary = files.map(f => `// FILE: ${f.path}\n${f.content}`).join("\n\n---\n\n");
  return `The following Expo React Native app has a runtime/compile error. Fix ALL errors so it runs in Expo Snack without issues.

ERROR:
${error}

RULES FOR FIX:
- Use JavaScript only (.js files). No TypeScript.
- Keep the same app idea and structure.
- Fix the specific error and any other issues you see.
- Return ONLY a valid JSON array of all files (same format as input).
- Do not add markdown, explanations, or code fences.

CURRENT FILES:
${filesSummary}

Return the complete fixed files array as JSON.`;
}

// ─── File Parser ──────────────────────────────────────────────────────────────

function parseGeneratedFiles(text: string, _prompt: string) {
  console.log("AI response length:", text.length);
  console.log("AI response preview:", text.slice(0, 400));
  console.log("AI response tail:", text.slice(-200));

  // Strip markdown code fences
  let cleaned = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Find the JSON array boundaries
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  const candidates = [
    cleaned,
    text,
    start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : null,
    start !== -1 && end !== -1 ? text.slice(text.indexOf("["), text.lastIndexOf("]") + 1) : null,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        console.log("Parsed", parsed.length, "files successfully");
        return parsed;
      }
    } catch (e) {
      console.log("Parse attempt failed:", String(e).slice(0, 100));
    }
  }

  // Last resort: try to repair truncated JSON by closing open brackets
  try {
    const s = start !== -1 ? cleaned.slice(start) : cleaned;
    const openBraces = (s.match(/\{/g) ?? []).length - (s.match(/\}/g) ?? []).length;
    const repaired = s + "}".repeat(Math.max(0, openBraces)) + "]";
    const parsed = JSON.parse(repaired);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      console.log("Parsed with repair:", parsed.length, "files");
      return parsed;
    }
  } catch (_) {}

  console.error("All parse attempts failed. Raw text sample:", text.slice(0, 800));
  throw new Error("Failed to parse the generated app. Please try again.");
}

// ─── Fallback Files ───────────────────────────────────────────────────────────

function getFallbackFiles(prompt: string) {
  const appName = extractAppName(prompt, undefined);
  const slug = appName.toLowerCase().replace(/\s+/g, "-");

  return [
    {
      name: "App.js",
      path: "App.js",
      language: "javascript",
      content: `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import DetailScreen from './screens/DetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#6C63FF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '${appName}' }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}`,
    },
    {
      name: "HomeScreen.js",
      path: "screens/HomeScreen.js",
      language: "javascript",
      content: `import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import Header from '../components/Header';

const ITEMS = [
  { id: '1', title: 'Getting Started', description: 'Learn how to use ${appName}' },
  { id: '2', title: 'Features', description: 'Explore all available features' },
  { id: '3', title: 'Settings', description: 'Customize your experience' },
];

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Header title="${appName}" subtitle="${prompt.slice(0, 50)}" />
      <FlatList
        data={ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Detail', { id: item.id })}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#666' },
});`,
    },
    {
      name: "DetailScreen.js",
      path: "screens/DetailScreen.js",
      language: "javascript",
      content: `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export default function DetailScreen({ navigation, route }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Item #{route.params.id}</Text>
        <Text style={styles.body}>This is the detail view for ${appName}.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  body: { fontSize: 16, color: '#555', lineHeight: 24, marginBottom: 32 },
  button: { backgroundColor: '#6C63FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});`,
    },
    {
      name: "Header.js",
      path: "components/Header.js",
      language: "javascript",
      content: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Header({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#6C63FF', padding: 24, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
});`,
    },
    {
      name: "package.json",
      path: "package.json",
      language: "json",
      content: JSON.stringify(
        {
          name: slug,
          version: "1.0.0",
          main: "node_modules/expo/AppEntry.js",
          scripts: {
            start: "expo start",
            android: "expo start --android",
            ios: "expo start --ios",
            web: "expo start --web",
          },
          dependencies: {
            expo: "~50.0.0",
            "expo-status-bar": "~1.11.1",
            react: "18.2.0",
            "react-native": "0.73.6",
            "@react-navigation/native": "^6.0.0",
            "@react-navigation/native-stack": "^6.0.0",
            "react-native-screens": "~3.29.0",
            "react-native-safe-area-context": "4.8.2",
          },
          devDependencies: {
            "@babel/core": "^7.20.0",
            "@types/react": "~18.2.45",
            "@types/react-native": "~0.73.0",
            typescript: "^5.1.3",
          },
        },
        null,
        2
      ),
    },
    {
      name: "app.json",
      path: "app.json",
      language: "json",
      content: JSON.stringify(
        {
          expo: {
            name: appName,
            slug,
            version: "1.0.0",
            orientation: "portrait",
            icon: "./assets/icon.png",
            userInterfaceStyle: "light",
            splash: {
              image: "./assets/splash.png",
              resizeMode: "contain",
              backgroundColor: "#6C63FF",
            },
            ios: { supportsTablet: true },
            android: { adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#6C63FF" } },
            web: { bundler: "metro" },
          },
        },
        null,
        2
      ),
    },
    {
      name: "tsconfig.json",
      path: "tsconfig.json",
      language: "json",
      content: JSON.stringify(
        {
          extends: "expo/tsconfig.base",
          compilerOptions: { strict: true, paths: { "@/*": ["./src/*"] } },
        },
        null,
        2
      ),
    },
    {
      name: "babel.config.js",
      path: "babel.config.js",
      language: "js",
      content: "module.exports = function (api) {\n  api.cache(true);\n  return {\n    presets: ['babel-preset-expo'],\n  };\n};",
    },
    {
      name: ".gitignore",
      path: ".gitignore",
      language: "text",
      content: `node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.DS_Store
*.env
*.env.local`,
    },
    {
      name: "README.md",
      path: "README.md",
      language: "markdown",
      content: `# ${appName}

> ${prompt}

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: \`npm install -g expo-cli\`
- Expo Go app on your phone (iOS/Android)

### Installation

\`\`\`bash
# 1. Unzip the project
unzip ${slug}.zip
cd ${slug}

# 2. Install dependencies
npm install

# 3. Start the development server
npx expo start
\`\`\`

### Running on Device

- **iOS Simulator**: Press \`i\` in the terminal
- **Android Emulator**: Press \`a\` in the terminal
- **Physical Device**: Scan the QR code with the Expo Go app

## 📁 Project Structure

\`\`\`
${slug}/
├── App.tsx                 # Entry point & navigation
├── src/
│   ├── screens/            # App screens
│   │   ├── HomeScreen.tsx
│   │   └── DetailScreen.tsx
│   └── components/         # Reusable components
│       ├── Header.tsx
│       └── Card.tsx
├── package.json
├── app.json
├── tsconfig.json
└── babel.config.js
\`\`\`

## 🛠 Tech Stack

- **React Native** 0.73.6
- **Expo** ~50.0.0
- **TypeScript**
- **React Navigation** v6

## 📄 License

MIT
`,
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAppName(prompt: string, projectName?: string): string {
  if (projectName) return projectName;
  const words = prompt.trim().split(/\s+/).slice(0, 3).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function extractScreens(files: any[]): string[] {
  const screens: string[] = [];
  for (const f of files) {
    if (f.path?.includes("screens/") || f.name?.toLowerCase().includes("screen")) {
      const name = f.name.replace(/\.(tsx?|jsx?)$/, "").replace(/Screen$/, "");
      if (name) screens.push(name);
    }
  }
  return screens.length > 0 ? screens : ["Home"];
}
