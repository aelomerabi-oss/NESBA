# NESBA USA

NESBA is a social educational platform built with Expo/React Native and Supabase.

## Current stack
- Expo 54
- React Native 0.81
- Expo Router
- Supabase
- AsyncStorage
- JavaScript

## Run
```bash
npm install
npx expo start
```

Use Expo Go for quick device testing, or an Android emulator/development build.

## Supabase
Run the SQL migrations in `src/sql/` in order. The latest core migration is:
`004_nesba_core.sql`

Never commit Supabase service-role keys. The client should only use a publishable/anon key.

## Core implemented
- Authentication
- Profiles/onboarding
- Courses and modules
- Enrollments
- Learning dashboard
- Lesson progress
- Certificates and verification
- Badges
- Creator applications
- Teacher/mentor/organization roles
- Organization profiles
- Following organizations
- Creator Studio
- Social posts
- Basic admin dashboard
- iOS/Android single codebase

Advanced live video, audio rooms, email automation, mentorship workflows, opportunities, AI and payments remain planned integrations.

### First administrator

After creating your owner account, run this once in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', verification_status = 'verified'
where email = 'YOUR_EMAIL_HERE';
```

Replace the email with the NESBA owner account email. Never put a service-role key in the mobile app.
