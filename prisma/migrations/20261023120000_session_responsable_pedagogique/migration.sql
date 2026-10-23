-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "responsablePedagogiqueId" TEXT;

-- CreateIndex
CREATE INDEX "TrainingSession_responsablePedagogiqueId_idx" ON "TrainingSession"("responsablePedagogiqueId");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_responsablePedagogiqueId_fkey" FOREIGN KEY ("responsablePedagogiqueId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
