import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';

export async function ensureSuperAdmin() {
  if (!mongoose.connection.readyState) return null;

  const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12);
  const user = await User.findOneAndUpdate(
    { email: env.SUPER_ADMIN_EMAIL },
    {
      name: env.SUPER_ADMIN_NAME,
      email: env.SUPER_ADMIN_EMAIL,
      passwordHash,
      role: 'SUPER_ADMIN'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`College super admin ready: ${user.email}`);
  return user;
}
