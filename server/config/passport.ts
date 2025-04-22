import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, UserStatus } from '../models/User.model';
import { Document } from 'mongoose';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.callbackURL as string, 
      scope: ['profile', 'email']
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails?.[0].value });

        if (!user) {
          user = await User.create({
            email: profile.emails?.[0].value,
            username: profile.emails?.[0].value.split('@')[0],
            name: profile.displayName,
            image: profile.photos?.[0].value,
            isEmailVerified: true,
            status: UserStatus.ONLINE
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, (user as Document & { _id: string })._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;