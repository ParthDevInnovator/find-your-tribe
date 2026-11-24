import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const roomSchema = new Schema({
  code: { type: String, required: true, unique: true },
  hostTokenHash: { type: String, required: true },
  status: { type: String, enum: ['lobby', 'grouping', 'grouped'], default: 'lobby' },
  isTest: { type: Boolean, default: false },
  startedAt: Date,
}, { timestamps: true });

const participantSchema = new Schema({
  roomCode: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  deviceId: String,
  nickname: { type: String, required: true },
  avatar: { type: String, required: true },
  answers: { type: [Number], default: [] },
  status: {
    type: String,
    enum: ['joined', 'answered', 'grouped', 'challenge_started', 'challenge_done', 'feedback_done'],
    default: 'joined',
  },
  teamId: { type: Schema.Types.ObjectId, default: null },
  answeredAt: Date,
  challengeStartedAt: Date,
  challengeDoneAt: Date,
  feedback: {
    talkedToNew: Boolean,
    wouldRepeat: { type: String, enum: ['yes', 'maybe', 'no'] },
  },
  feedbackAt: Date,
}, { timestamps: true });

const teamSchema = new Schema({
  roomCode: { type: String, required: true, index: true },
  name: String,
  emoji: String,
  color: String,
  connection: String,
  starter: String,
  challengeId: Number,
  memberIds: [{ type: Schema.Types.ObjectId }],
  challengeStartedAt: Date,
  challengeCompletedAt: Date,
}, { timestamps: true });

export const Room = model('Room', roomSchema);
export const Participant = model('Participant', participantSchema);
export const Team = model('Team', teamSchema);
