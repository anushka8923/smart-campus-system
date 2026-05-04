import { getCache, setCache } from '../../services/cache.service.js';
import { Event } from '../events/event.model.js';
import { Hackathon } from '../hackathons/hackathon.model.js';
import { Registration } from '../registrations/registration.model.js';

function tokenize(item) {
  return [
    item.title,
    item.description,
    item.category,
    item.eventType,
    item.society?.name,
    item.society?.category,
    ...(item.tags || []),
    ...(item.themes || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function publicFilter() {
  return {
    approvalStatus: 'APPROVED',
    status: { $in: ['APPROVED', 'PUBLISHED'] },
    visibility: 'PUBLIC'
  };
}

async function getCollaborativeTargetIds(userId) {
  const mine = await Registration.find({ student: userId, status: { $ne: 'CANCELLED' } }).select('targetType targetId');
  const mineKeys = new Set(mine.map((item) => `${item.targetType}:${item.targetId}`));
  if (mineKeys.size === 0) return new Map();

  const peers = await Registration.find({
    student: { $ne: userId },
    status: { $ne: 'CANCELLED' },
    $or: mine.map((item) => ({ targetType: item.targetType, targetId: item.targetId }))
  }).select('student');

  const peerIds = [...new Set(peers.map((peer) => String(peer.student)))];
  if (peerIds.length === 0) return new Map();

  const peerRegistrations = await Registration.find({ student: { $in: peerIds }, status: { $ne: 'CANCELLED' } }).select('targetType targetId');
  const scores = new Map();
  peerRegistrations.forEach((registration) => {
    const key = `${registration.targetType}:${registration.targetId}`;
    if (!mineKeys.has(key)) scores.set(key, (scores.get(key) || 0) + 1);
  });
  return scores;
}

async function getPopularityScores() {
  const rows = await Registration.aggregate([
    { $match: { status: { $ne: 'CANCELLED' } } },
    { $group: { _id: { targetType: '$targetType', targetId: '$targetId' }, count: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [`${row._id.targetType}:${row._id.targetId}`, row.count]));
}

export async function recommendForMe(req, res, next) {
  try {
    const cacheKey = `recommendations:${req.user._id}:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 30);
    const interests = (req.user.interests || []).map((interest) => interest.toLowerCase());
    const [events, hackathons, collaborative, popularity, registered] = await Promise.all([
      Event.find({ ...publicFilter(), date: { $gte: new Date() } }).sort({ date: 1 }).limit(80).populate('society', 'name category'),
      Hackathon.find({ ...publicFilter(), startDate: { $gte: new Date() } }).sort({ startDate: 1 }).limit(80).populate('society', 'name category'),
      getCollaborativeTargetIds(req.user._id),
      getPopularityScores(),
      Registration.find({ student: req.user._id, status: { $ne: 'CANCELLED' } }).select('targetType targetId')
    ]);

    const registeredKeys = new Set(registered.map((item) => `${item.targetType}:${item.targetId}`));
    const items = [
      ...events.map((item) => ({ targetType: 'EVENT', item, date: item.date })),
      ...hackathons.map((item) => ({ targetType: 'HACKATHON', item, date: item.startDate }))
    ];

    const recommendations = items
      .filter(({ targetType, item }) => !registeredKeys.has(`${targetType}:${item._id}`))
      .map(({ targetType, item, date }) => {
        const text = tokenize(item);
        const interestHits = interests.filter((interest) => text.includes(interest)).length;
        const key = `${targetType}:${item._id}`;
        const collaborativeScore = collaborative.get(key) || 0;
        const trendingScore = popularity.get(key) || 0;
        const score = interestHits * 5 + collaborativeScore * 3 + trendingScore;
        const reasons = [];
        if (interestHits) reasons.push('interest_match');
        if (collaborativeScore) reasons.push('similar_students');
        if (trendingScore) reasons.push('trending');
        if (reasons.length === 0) reasons.push('upcoming');
        return { targetType, item, score, reasons, date };
      })
      .sort((left, right) => right.score - left.score || new Date(left.date) - new Date(right.date))
      .slice(0, limit);

    const payload = { recommendations };
    await setCache(cacheKey, payload, 60);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}
