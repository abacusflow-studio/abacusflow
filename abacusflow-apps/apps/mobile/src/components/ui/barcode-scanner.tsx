import { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void | Promise<void>;
  onClose: () => void;
  title?: string;
  hint?: string;
  continuous?: boolean;
  scanCooldownMs?: number;
  scannedMessage?: string;
}

export function BarcodeScanner({
  onScan,
  onClose,
  title,
  hint = "将条码/二维码放入框内",
  continuous = false,
  scanCooldownMs = 900,
  scannedMessage = "已记录，继续扫描",
}: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanningLockRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>正在请求相机权限...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#999" />
        <Text style={styles.text}>需要相机权限来扫描条码</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>授权相机</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resetScanState = () => {
    scanningLockRef.current = false;
    setScanned(false);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanningLockRef.current) return;
    scanningLockRef.current = true;
    setScanned(true);
    try {
      await onScan(data);
    } catch (err) {
      console.error("Barcode scan handler failed", err);
    } finally {
      if (continuous) {
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = setTimeout(resetScanState, scanCooldownMs);
      } else {
        scanningLockRef.current = false;
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "code128",
            "code39",
            "upc_a",
            "upc_e",
          ],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {title && <Text style={styles.title}>{title}</Text>}
          <View style={{ width: 44 }} />
        </View>

        {/* Scan frame */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>{hint}</Text>
        </View>

        {/* Bottom */}
        <View style={styles.bottom}>
          {scanned && continuous ? (
            <View style={styles.scanStatus}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.rescanText}>{scannedMessage}</Text>
            </View>
          ) : scanned ? (
            <TouchableOpacity style={styles.rescanBtn} onPress={resetScanState}>
              <Ionicons name="scan" size={20} color="#fff" />
              <Text style={styles.rescanText}>重新扫描</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 32,
    gap: 16,
  },
  text: { fontSize: 15, color: "#666", textAlign: "center" },
  btn: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { color: "#999", fontSize: 14 },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  scanArea: { alignItems: "center", gap: 16 },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "#1677ff",
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "#1677ff",
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "#1677ff",
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "#1677ff",
  },
  hint: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  bottom: { alignItems: "center", paddingBottom: 80 },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(22,119,255,0.9)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  scanStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(22,163,74,0.9)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  rescanText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
