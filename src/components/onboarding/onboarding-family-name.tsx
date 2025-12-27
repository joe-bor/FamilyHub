import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { familyNameSchema } from "@/lib/validations/family";

type FamilyNameFormData = z.infer<typeof familyNameSchema>;

interface OnboardingFamilyNameProps {
  initialName: string;
  onNext: (name: string) => void;
  onBack: () => void;
}

export function OnboardingFamilyName({
  initialName,
  onNext,
  onBack,
}: OnboardingFamilyNameProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FamilyNameFormData>({
    resolver: zodResolver(familyNameSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = (data: FamilyNameFormData) => {
    onNext(data.name);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 bg-background">
      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">Step 1 of 2</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              What's your family name?
            </h1>
            <p className="text-muted-foreground">
              This will be displayed at the top of your calendar.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-family-name" className="sr-only">
              Family Name
            </Label>
            <Input
              id="onboarding-family-name"
              placeholder="The Smiths"
              className="text-center text-lg h-14"
              autoComplete="off"
              autoFocus
              aria-describedby={
                errors.name ? "onboarding-family-name-error" : undefined
              }
              aria-invalid={errors.name ? "true" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p
                id="onboarding-family-name-error"
                className="text-sm text-destructive text-center"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
