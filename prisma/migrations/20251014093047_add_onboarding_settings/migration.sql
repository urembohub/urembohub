-- CreateTable
CREATE TABLE "public"."onboarding_settings" (
    "id" TEXT NOT NULL,
    "use_multi_step_form" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_settings_pkey" PRIMARY KEY ("id")
);
