import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Event } from '../modules/events/event.model.js';
import { Society } from '../modules/societies/society.model.js';
import { User } from '../modules/users/user.model.js';

const accounts = [
  { name: 'College Super Admin', email: 'superadmin@college.com', password: 'Super@123', role: 'SUPER_ADMIN' },
  { name: 'Coding Club Admin', email: 'codingadmin@college.com', password: 'Admin@123', role: 'SOCIETY_ADMIN', society: 'Coding Club' },
  { name: 'Cultural Society Admin', email: 'cultureadmin@college.com', password: 'Admin@123', role: 'SOCIETY_ADMIN', society: 'Cultural Society' },
  {
    name: 'Demo Student',
    email: 'student@college.com',
    password: 'Student@123',
    role: 'STUDENT',
    interests: ['coding', 'robotics', 'design'],
    department: 'Computer Science',
    course: 'B.Tech',
    year: 2
  }
];

const societies = [
  { name: 'Coding Club', description: 'Technical events, hackathons, and coding contests.', category: 'TECHNICAL', contactEmail: 'codingadmin@college.com' },
  { name: 'Cultural Society', description: 'Music, dance, theatre, and campus cultural festivals.', category: 'CULTURAL', contactEmail: 'cultureadmin@college.com' }
];

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function upsertUser(account) {
  const passwordHash = await bcrypt.hash(account.password, 12);
  return User.findOneAndUpdate(
    { email: account.email },
    {
      name: account.name,
      email: account.email,
      passwordHash,
      role: account.role,
      interests: account.interests || [],
      department: account.department,
      course: account.course,
      year: account.year
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

await connectDB();

const users = new Map();
for (const account of accounts) {
  const user = await upsertUser(account);
  users.set(account.email, user);
}

const societyDocs = new Map();
for (const society of societies) {
  const adminAccount = accounts.find((account) => account.society === society.name);
  const admin = adminAccount ? users.get(adminAccount.email) : null;
  const doc = await Society.findOneAndUpdate(
    { name: society.name },
    {
      ...society,
      admins: admin ? [admin._id] : [],
      isActive: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  societyDocs.set(society.name, doc);
}

const codingAdmin = users.get('codingadmin@college.com');
const cultureAdmin = users.get('cultureadmin@college.com');
const superAdmin = users.get('superadmin@college.com');

const demoEvents = [
  {
    title: 'Campus Code Sprint',
    description: 'A fast-paced coding competition for students interested in algorithms, web development, and problem solving.',
    category: 'TECHNICAL',
    eventType: 'competition',
    tags: ['coding', 'web', 'algorithms'],
    society: societyDocs.get('Coding Club')._id,
    createdBy: codingAdmin._id,
    date: daysFromNow(12),
    registrationDeadline: daysFromNow(7),
    venue: 'Computer Lab 2',
    posterUrl: 'https://placehold.co/900x500?text=Campus+Code+Sprint',
    registrationLink: 'https://forms.gle/demo-code-sprint',
    registrationUrl: 'https://forms.gle/demo-code-sprint',
    registrationFee: 0,
    eligibility: 'Open to all college students',
    teamSize: '1-2',
    contactEmail: 'codingadmin@college.com',
    contactPhone: '9999999999',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    approvedBy: superAdmin._id,
    approvedAt: new Date()
  },
  {
    title: 'Smart Campus Hackathon',
    description: 'Build solutions for college automation, AI recommendations, and student productivity.',
    category: 'TECHNICAL',
    eventType: 'hackathon',
    tags: ['coding', 'robotics', 'ai', 'design'],
    society: societyDocs.get('Coding Club')._id,
    createdBy: codingAdmin._id,
    date: daysFromNow(20),
    registrationDeadline: daysFromNow(10),
    venue: 'Innovation Lab',
    posterUrl: 'https://placehold.co/900x500?text=Smart+Campus+Hackathon',
    registrationLink: 'https://devfolio.co/demo-smart-campus',
    registrationUrl: 'https://devfolio.co/demo-smart-campus',
    registrationFee: 100,
    eligibility: 'Teams from any department',
    teamSize: '2-4',
    contactEmail: 'codingadmin@college.com',
    contactPhone: '9999999999',
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    approvedBy: superAdmin._id,
    approvedAt: new Date()
  },
  {
    title: 'Rhythm Night Auditions',
    description: 'Dance and music auditions for the annual cultural fest.',
    category: 'CULTURAL',
    eventType: 'event',
    tags: ['dance', 'music', 'culture'],
    society: societyDocs.get('Cultural Society')._id,
    createdBy: cultureAdmin._id,
    date: daysFromNow(15),
    registrationDeadline: daysFromNow(8),
    venue: 'Auditorium',
    posterUrl: 'https://placehold.co/900x500?text=Rhythm+Night',
    registrationLink: 'https://forms.gle/demo-rhythm-night',
    registrationUrl: 'https://forms.gle/demo-rhythm-night',
    registrationFee: 0,
    eligibility: 'Open to all performers',
    teamSize: 'Solo or group',
    contactEmail: 'cultureadmin@college.com',
    contactPhone: '8888888888',
    status: 'PENDING',
    approvalStatus: 'PENDING'
  }
];

for (const event of demoEvents) {
  await Event.findOneAndUpdate({ title: event.title }, event, { upsert: true, new: true, setDefaultsOnInsert: true });
}

console.log('Demo data ready:');
accounts.forEach((account) => console.log(`${account.role}: ${account.email} / ${account.password}`));

await mongoose.disconnect();
