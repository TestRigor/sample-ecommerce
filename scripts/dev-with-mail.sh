#!/bin/sh
# Start the Next.js dev server with the SMTP credentials loaded from ~/.zshrc.
# The plain `next dev` launched by tooling does NOT source ~/.zshrc, so the app
# would see no SMTP_* vars and fall back to a non-delivering console transport
# (this was why no mail reached Brevo / the dashboard stayed empty).
#
# Usage: npm run dev:mail
# --color=never is essential: a colorizing grep injects ANSI escapes that break `eval`.
eval "$(grep --color=never -E '^[[:space:]]*export[[:space:]]+(SMTP_(HOST|PORT|USER|PASS)|MAIL_FROM)=' "$HOME/.zshrc")"
# Brevo (and most relays) require the From to be a VERIFIED sender. If you don't
# set MAIL_FROM in ~/.zshrc, fall back to the SMTP login.
export MAIL_FROM="${MAIL_FROM:-$SMTP_USER}"
echo "dev:mail -> SMTP_HOST=$SMTP_HOST  MAIL_FROM=$MAIL_FROM"
exec npx next dev
