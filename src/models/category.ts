import { Document, Schema, Types, model } from "mongoose";
import { MultilingualName } from "../types/i18n";
import { GROUPS, Group } from "../types/group";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: MultilingualName;
  group: Group;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const multilingualNameSchema = new Schema<MultilingualName>(
  {
    uk: { type: String, required: true, trim: true },
    en: { type: String, trim: true },
    ka: { type: String, trim: true },
  },
  { _id: false },
);

const categorySchema = new Schema<ICategory>(
  {
    name: { type: multilingualNameSchema, required: true },
    group: { type: String, enum: GROUPS, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ group: 1 });

export const Category = model<ICategory>("Category", categorySchema);
