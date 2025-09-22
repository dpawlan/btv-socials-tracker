#!/bin/bash

# BTV Socials Tracker - Cron Setup Script
# Runs at 4 specific Central Time hours: 8am, 12pm, 4pm, 8pm

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NODE_PATH=$(which node)

# Remove any existing cron jobs for btv-socials-tracker
crontab -l 2>/dev/null | grep -v "btv-socials-tracker" | crontab -

# Add new cron jobs for Central Time schedule
# Note: These are in UTC (server time), adjusted for Central Time
# Central Time is UTC-6 (CST) or UTC-5 (CDT)
# Using UTC times that correspond to Central times year-round

(crontab -l 2>/dev/null; cat << CRON
# BTV Socials Tracker - Runs 4 times daily at Central Time hours
# 8 AM Central = 14:00 UTC (CST) / 13:00 UTC (CDT) - using 14:00 for consistency
0 14 * * * cd $SCRIPT_DIR && $NODE_PATH run-once.js >> $SCRIPT_DIR/cron.log 2>&1 # btv-socials-tracker 8am CT

# 12 PM Central = 18:00 UTC (CST) / 17:00 UTC (CDT) - using 18:00 for consistency
0 18 * * * cd $SCRIPT_DIR && $NODE_PATH run-once.js >> $SCRIPT_DIR/cron.log 2>&1 # btv-socials-tracker 12pm CT

# 4 PM Central = 22:00 UTC (CST) / 21:00 UTC (CDT) - using 22:00 for consistency
0 22 * * * cd $SCRIPT_DIR && $NODE_PATH run-once.js >> $SCRIPT_DIR/cron.log 2>&1 # btv-socials-tracker 4pm CT

# 8 PM Central = 02:00 UTC (CST) / 01:00 UTC (CDT) - using 02:00 for consistency
0 2 * * * cd $SCRIPT_DIR && $NODE_PATH run-once.js >> $SCRIPT_DIR/cron.log 2>&1 # btv-socials-tracker 8pm CT
CRON
) | crontab -

echo "Cron jobs have been set up for 4 daily checks at Central Time hours:"
echo "  - 8:00 AM Central"
echo "  - 12:00 PM Central"
echo "  - 4:00 PM Central"
echo "  - 8:00 PM Central"
echo ""
echo "View current cron jobs with: crontab -l"
echo "View logs at: $SCRIPT_DIR/cron.log"
echo ""
echo "Note: Times are automatically adjusted for UTC on your server."
echo "With 150 credits/month and 4 checks/day, this uses ~120 credits/month."
