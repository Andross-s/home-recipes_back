import { Document, Schema, Types, model } from "mongoose";
import { GROUPS, Group } from "../types/group";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  group: Group;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    group: { type: String, enum: GROUPS, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ group: 1 });

export const Category = model<ICategory>("Category", categorySchema);
