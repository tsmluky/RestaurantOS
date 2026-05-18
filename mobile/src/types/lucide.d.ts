import "lucide-react-native";

declare module "lucide-react-native" {
  interface LucideProps {
    color?: string;
    stroke?: string;
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    style?: object;
  }
}
