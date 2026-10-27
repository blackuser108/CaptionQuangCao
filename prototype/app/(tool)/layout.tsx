import { WorkbenchProvider } from '../../components/WorkbenchProvider';

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <WorkbenchProvider>{children}</WorkbenchProvider>;
}
