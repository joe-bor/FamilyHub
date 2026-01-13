import { LoginForm } from "./login-form";

interface LoginFlowProps {
  onStartOnboarding: () => void;
}

export function LoginFlow({ onStartOnboarding }: LoginFlowProps) {
  return <LoginForm onSwitchToOnboarding={onStartOnboarding} />;
}
