import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createPrdSchema } from "@/lib/validation/prds";
import type { CreatePrdCommand } from "@/types";

interface CreatePrdFormProps {
  onSubmit: (command: CreatePrdCommand) => Promise<void>;
  isSubmitting: boolean;
}

export function CreatePrdForm({ onSubmit, isSubmitting }: CreatePrdFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePrdCommand>({
    resolver: zodResolver(createPrdSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nazwa projektu</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="np. System zarządzania użytkownikami"
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mainProblem">Główny problem</Label>
        <Textarea
          id="mainProblem"
          {...register("mainProblem")}
          placeholder="Opisz główny problem, który rozwiązuje ten projekt..."
          rows={3}
          disabled={isSubmitting}
        />
        {errors.mainProblem && <p className="text-sm text-destructive">{errors.mainProblem.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="inScope">W zakresie projektu</Label>
        <Textarea
          id="inScope"
          {...register("inScope")}
          placeholder="Co jest w zakresie tego projektu..."
          rows={3}
          disabled={isSubmitting}
        />
        {errors.inScope && <p className="text-sm text-destructive">{errors.inScope.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="outOfScope">Poza zakresem projektu</Label>
        <Textarea
          id="outOfScope"
          {...register("outOfScope")}
          placeholder="Co jest poza zakresem tego projektu..."
          rows={3}
          disabled={isSubmitting}
        />
        {errors.outOfScope && <p className="text-sm text-destructive">{errors.outOfScope.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="successCriteria">Kryteria sukcesu</Label>
        <Textarea
          id="successCriteria"
          {...register("successCriteria")}
          placeholder="Jakie są kryteria sukcesu tego projektu..."
          rows={3}
          disabled={isSubmitting}
        />
        {errors.successCriteria && <p className="text-sm text-destructive">{errors.successCriteria.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Tworzenie..." : "Utwórz PRD"}
        </Button>
      </div>
    </form>
  );
}
