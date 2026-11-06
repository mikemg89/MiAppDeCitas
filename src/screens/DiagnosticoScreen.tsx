// Pantalla temporal de diagnóstico, para probar en el celular que la app
// alcanza el backend y que el flujo de registro funciona de punta a punta.
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import apiClient, { API_ROOT } from "../services/apiClient";

function describeError(error: unknown): string {
  const e = error as {
    response?: { status?: number; data?: { error?: string; code?: string } };
    message?: string;
  };
  if (e?.response) {
    const code = e.response.data?.code ? ` (${e.response.data.code})` : "";
    return `${e.response.status} · ${e.response.data?.error ?? "sin detalle"}${code}`;
  }
  return e?.message ?? "Error desconocido";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function DiagnosticoScreen() {
  const [busy, setBusy] = useState<string | null>(null);
  const [health, setHealth] = useState("sin probar");
  const [ready, setReady] = useState("sin probar");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [otp, setOtp] = useState("");
  const [registerOut, setRegisterOut] = useState("");
  const [verifyOut, setVerifyOut] = useState("");

  async function ping() {
    setBusy("ping");
    setHealth("…");
    setReady("…");

    try {
      const res = await apiClient.get(`${API_ROOT}/health`);
      setHealth(`OK ${res.status}`);
    } catch (error) {
      setHealth(describeError(error));
    }

    try {
      const res = await apiClient.get(`${API_ROOT}/ready`);
      setReady(`OK ${res.status} · ${JSON.stringify(res.data)}`);
    } catch (error) {
      setReady(describeError(error));
    }

    setBusy(null);
  }

  async function register() {
    setBusy("register");
    setRegisterOut("…");
    try {
      const res = await apiClient.post("/auth/register", {
        email: email.trim(),
        password,
        inviteCode: invite.trim(),
      });
      setRegisterOut(`${res.status} · ${res.data.message ?? "ok"}`);
    } catch (error) {
      setRegisterOut(describeError(error));
    }
    setBusy(null);
  }

  async function verify() {
    setBusy("verify");
    setVerifyOut("…");
    try {
      const res = await apiClient.post("/auth/verify-email", {
        email: email.trim(),
        code: otp.trim(),
      });
      setVerifyOut(`${res.status} · ${res.data.message ?? "ok"}`);
    } catch (error) {
      setVerifyOut(describeError(error));
    }
    setBusy(null);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>DateApp</Text>
        <Text style={styles.subtitle}>Diagnóstico en el dispositivo</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entorno</Text>
          <Row label="Plataforma" value={`${Platform.OS} ${String(Platform.Version)}`} />
          <Row label="API" value={API_ROOT} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conexión con el backend</Text>
          <Row label="/health" value={health} />
          <Row label="/ready" value={ready} />
          <Pressable
            style={[styles.button, busy === "ping" && styles.buttonDisabled]}
            onPress={ping}
            disabled={busy !== null}
          >
            {busy === "ping" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Probar conexión</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registro (paso 1)</Text>
          <TextInput
            style={styles.input}
            placeholder="email@ejemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña (Password1)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Código de invitación"
            autoCapitalize="characters"
            value={invite}
            onChangeText={setInvite}
          />
          <Pressable
            style={[styles.button, busy === "register" && styles.buttonDisabled]}
            onPress={register}
            disabled={busy !== null}
          >
            {busy === "register" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </Pressable>
          {registerOut ? <Text style={styles.output}>{registerOut}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verificar correo (paso 1)</Text>
          <Text style={styles.hint}>
            El código aparece en la terminal donde corre el backend.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <Pressable
            style={[styles.button, busy === "verify" && styles.buttonDisabled]}
            onPress={verify}
            disabled={busy !== null}
          >
            {busy === "verify" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verificar</Text>
            )}
          </Pressable>
          {verifyOut ? <Text style={styles.output}>{verifyOut}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "android" ? 36 : 0,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  rowLabel: {
    width: 92,
    color: "#64748b",
    fontSize: 13,
  },
  rowValue: {
    flex: 1,
    color: "#0f172a",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  output: {
    marginTop: 10,
    color: "#0f172a",
    fontSize: 13,
  },
  hint: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 8,
  },
});
