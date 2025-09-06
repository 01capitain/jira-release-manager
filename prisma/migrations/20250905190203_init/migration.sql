-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";

-- CreateTable
CREATE TABLE "public"."ReleaseVersion" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseVersion_name_key" ON "public"."ReleaseVersion"("name");
