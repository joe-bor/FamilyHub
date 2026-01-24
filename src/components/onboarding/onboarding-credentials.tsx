import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCheckUsername } from "@/api";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks";
import {
  type CredentialsFormData,
  credentialsFormSchema,
} from "@/lib/validations/auth";

interface OnboardingCredentialsProps {
  onNext: (username: string, password: string) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function OnboardingCredentials({
  onNext,
  onBack,
  isSubmitting,
}: OnboardingCredentialsProps) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsFormSchema),
  });

  const username = watch("username");
  const debouncedUsername = useDebounce(username || "", 500);

  const { data: usernameCheck, isFetching: isCheckingUsername } =
    useCheckUsername(debouncedUsername, debouncedUsername.length >= 3);

  // Update error state based on username availability
  useEffect(() => {
    if (usernameCheck && !usernameCheck.data.available) {
      setError("username", { message: "Username is already taken" });
    } else if (
      usernameCheck?.data.available &&
      errors.username?.message === "Username is already taken"
    ) {
      clearErrors("username");
    }
  }, [usernameCheck, setError, clearErrors, errors.username?.message]);

  const onSubmit = (data: CredentialsFormData) => {
    if (usernameCheck && !usernameCheck.data.available) {
      setError("username", { message: "Username is already taken" });
      return;
    }
    onNext(data.username, data.password);
  };

  const showUsernameStatus = debouncedUsername.length >= 3;

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 bg-background">
      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">Step 3 of 3</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Create Your Login
            </h1>
            <p className="text-muted-foreground">
              Your family will use these credentials to sign in on any device.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credentials-username">Username</Label>
              <div className="relative">
                <Input
                  id="credentials-username"
                  placeholder="your_family_username"
                  autoComplete="username"
                  autoFocus
                  className="pr-10"
                  {...register("username")}
                />
                {showUsernameStatus && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : usernameCheck?.data.available ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <FormError message={errors.username?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials-password">Password</Label>
              <Input
                id="credentials-password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...register("password")}
              />
              <FormError message={errors.password?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials-confirm-password">
                Confirm Password
              </Label>
              <Input
                id="credentials-confirm-password"
                type="password"
                placeholder="Confirm your password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              <FormError message={errors.confirmPassword?.message} />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || isCheckingUsername}
          >
            {isSubmitting ? "Creating Account..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
