import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './db';
import { env } from './env';
import { logger } from './logger';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { team: true },
          });
          session.user.teamId = dbUser?.teamId ?? undefined;
          session.user.plan = dbUser?.team?.plan ?? 'free';
        } catch (err) {
          logger.error('Error fetching user in session callback', {
            userId: user.id,
            error: err instanceof Error ? err.message : String(err),
          });
          // Return session without team info rather than crashing
        }
      }
      return session;
    },
    async signIn({ user }) {
      try {
        // Auto-create a team for new users
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { teamId: true },
        });
        if (dbUser && !dbUser.teamId) {
          const team = await prisma.team.create({
            data: {
              name: `${user.name ?? user.email ?? 'User'}'s Team`,
              slug: `team-${user.id.slice(0, 8)}`,
            },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { teamId: team.id },
          });
          logger.info('Auto-created team for new user', {
            userId: user.id,
            teamId: team.id,
          });
        }
        return true;
      } catch (err) {
        logger.error('Error during signIn callback', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        // Returning false blocks the sign-in; returning true lets it proceed
        // even if the team creation failed (they can retry later).
        return true;
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'database',
  },
};
