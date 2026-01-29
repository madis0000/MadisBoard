import { sentry, tracker } from '@madisboard/track';

// Telemetry and Sentry are disabled for MadisBoard
// No data is sent to external servers
sentry.disable();
tracker.opt_out_tracking();
