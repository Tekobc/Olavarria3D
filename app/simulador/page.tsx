import type { Metadata } from "next";
import { PrinterSimulator } from "@/app/components/PrinterSimulator";

export const metadata: Metadata = {
  title: "Simulador de impresión 3D",
  description:
    "Explorá una simulación interactiva de impresión 3D y mirá cómo se construye una pieza capa por capa.",
};

export default function SimulatorPage() {
  return <PrinterSimulator />;
}
