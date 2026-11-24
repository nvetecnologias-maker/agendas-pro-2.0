import { SmoothScrollProvider } from "@/components/animations/smooth-scroll-provider";
import { MotionProvider } from "@/components/animations/motion-provider";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
    </MotionProvider>
  );
}
