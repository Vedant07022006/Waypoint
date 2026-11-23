import cron from "node-cron";
import { checkExpiredStages } from "../services/sla.service.js";
import logger from "./logger.js";

/**
 * startSLAScheduler()
 *
 * Registers a node-cron job that runs every 15 minutes.
 * On each tick it calls checkExpiredStages() which:
 *   1. Finds all IN_PROGRESS stages past their slaDeadline
 *   2. For each breached stage — auto-reassign (ML) or hard-escalate to team lead
 *
 * Call this ONCE from index.js after DB is connected.
 */
export const startSLAScheduler = () => {
    // Cron pattern: runs every 1 minute for rapid testing ("* * * * *")
    cron.schedule("* * * * *", async () => {
        logger.info("SLA scheduler tick — scanning for expired stages...");
        try {
            const breachedCount = await checkExpiredStages();
            if (breachedCount > 0) {
                logger.warn(`SLA scheduler: handled ${breachedCount} breached stage(s)`);
            } else {
                logger.info("SLA scheduler: no expired stages found");
            }
        } catch (err) {
            logger.error("SLA scheduler: unhandled error during tick", {
                error: err.message,
                stack: err.stack,
            });
        }
    });

    logger.info("SLA scheduler started — runs every 15 minutes");
};
