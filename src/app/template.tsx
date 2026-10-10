import { PageEnter } from "@/components/motion";

// A template re-mounts on every navigation, so each page gets a soft enter animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}
