-- CreateIndex
CREATE INDEX "WebhookLog_provider_eventType_idx" ON "WebhookLog"("provider", "eventType");
