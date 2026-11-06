// Grabación del video-selfie: el servidor emite un código, el usuario lo dice
// en voz alta frente a la cámara y el video se sube para revisión.
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { File } from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import apiClient, { API_ROOT } from "../services/apiClient";
import { getAccessToken } from "../services/authTokenManager";

const MAX_SECONDS = 6;

type Phase = "loading" | "idle" | "ready" | "recording" | "uploading" | "sent";

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

export default function VerificacionScreen({ onBack }: { onBack: () => void }) {
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [videoStatus, setVideoStatus] = useState("NONE");
  const [challenge, setChallenge] = useState<{ id: string; code: string } | null>(
    null,
  );
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await apiClient.get("/verification/status");
        if (!alive) return;
        setVideoStatus(res.data.videoStatus ?? "NONE");
      } catch (err) {
        if (!alive) return;
        setError(describeError(err));
      } finally {
        if (alive) setPhase("idle");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function requestChallenge() {
    setError("");
    setMessage("");

    try {
      const res = await apiClient.post("/verification/challenge", {});
      setChallenge({ id: res.data.verificationId, code: res.data.code });
      setPhase("ready");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function startRecording() {
    if (!cameraRef.current || !challenge) return;

    setError("");
    setPhase("recording");
    setSeconds(0);

    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_SECONDS,
      });

      if (!video?.uri) {
        throw new Error("No se pudo grabar el video");
      }

      setPhase("uploading");
      await upload(video.uri);
    } catch (err) {
      setError(describeError(err));
      setPhase("ready");
    } finally {
      clearInterval(timer);
    }
  }

  async function upload(uri: string) {
    const token = getAccessToken();
    if (!token || !challenge) {
      throw new Error("Sesión vencida: vuelve a iniciar sesión");
    }

    const file = new File(uri);
    const result = await file.upload(`${API_ROOT}/api/verification/video`, {
      httpMethod: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-verification-id": challenge.id,
      },
    });

    if (result.status === 202) {
      setPhase("sent");
      setVideoStatus("PENDING");
      setMessage("Video enviado. Queda pendiente de revisión.");
      return;
    }

    let detail = `El servidor respondió ${result.status}`;
    try {
      const body = JSON.parse(result.body) as { error?: string; code?: string };
      detail = `${result.status} · ${body.error ?? "error"}${body.code ? ` (${body.code})` : ""}`;
    } catch {
      // cuerpo no JSON: se deja el mensaje genérico
    }
    throw new Error(detail);
  }

  function reset() {
    setChallenge(null);
    setPhase("idle");
    setMessage("");
    setError("");
  }

  const permissionsReady = cameraPermission?.granted && micPermission?.granted;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Verificación por video</Text>
      </View>

      <View style={styles.body}>
        {phase === "loading" ? (
          <ActivityIndicator color="#fff" />
        ) : videoStatus === "APPROVED" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ Ya estás verificado</Text>
            <Text style={styles.paragraph}>
              Tu video fue aprobado. No necesitas grabar otro.
            </Text>
          </View>
        ) : videoStatus === "PENDING" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏳ Video en revisión</Text>
            <Text style={styles.paragraph}>
              Recibimos tu video. Te avisaremos cuando esté revisado.
            </Text>
          </View>
        ) : !permissionsReady ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Permisos necesarios</Text>
            <Text style={styles.paragraph}>
              Necesitamos cámara y micrófono para grabar el video.
            </Text>
            <Pressable
              style={styles.button}
              onPress={async () => {
                if (!cameraPermission?.granted) await requestCamera();
                if (!micPermission?.granted) await requestMic();
              }}
            >
              <Text style={styles.buttonText}>Permitir cámara y micrófono</Text>
            </Pressable>
          </View>
        ) : !challenge ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Paso 1 · Tu código</Text>
            <Text style={styles.paragraph}>
              Genera un código y dilo en voz alta mientras grabas. Sirve para
              comprobar que el video es de ahora y no uno pregrabado.
            </Text>
            <Pressable style={styles.button} onPress={requestChallenge}>
              <Text style={styles.buttonText}>Generar código</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Di este código en voz alta</Text>
              <Text style={styles.code}>{challenge.code}</Text>
            </View>

            <View style={styles.cameraWrapper}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                mode="video"
              />
              {phase === "recording" ? (
                <View style={styles.recordingBadge}>
                  <Text style={styles.recordingText}>
                    ● Grabando {Math.min(seconds, MAX_SECONDS)}/{MAX_SECONDS}s
                  </Text>
                </View>
              ) : null}
            </View>

            {phase === "uploading" ? (
              <View style={styles.centerRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.paragraph}> Subiendo video…</Text>
              </View>
            ) : phase === "recording" ? (
              <Text style={styles.hint}>
                Mira a la cámara y di el código. Se detiene solo.
              </Text>
            ) : (
              <Pressable style={styles.button} onPress={startRecording}>
                <Text style={styles.buttonText}>Grabar video</Text>
              </Pressable>
            )}

            <Pressable onPress={reset} hitSlop={10}>
              <Text style={styles.secondary}>Cancelar y generar otro código</Text>
            </Pressable>
          </>
        )}

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingTop: 36,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: {
    color: "#93c5fd",
    fontSize: 16,
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  paragraph: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  codeLabel: {
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    color: "#0f172a",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 8,
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  recordingBadge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(220,38,38,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  recordingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  secondary: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 6,
  },
  hint: {
    color: "#cbd5e1",
    textAlign: "center",
    fontSize: 13,
  },
  centerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  success: {
    color: "#86efac",
    fontSize: 14,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
});
