import { Schema, model } from "mongoose";

const newsSchema = new Schema(
  {
    title: {
      type: String,
    },
    subtitle: {
      type: String,
      default: "", // e.g. "News", "Guide", "Checklist"
    },
    date: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      default: "Property Advice",
    },
    coverimage: {
      type: String,
      default: "",
    },
    sections: [
      {
        heading: { type: String },
        content: { type: String }, // can hold HTML or Markdown
        subpoints: [
          {
            subheading: { type: String },
            text: { type: String }, // support for a → b → c type breakdown
          },
        ],
      },
    ],
    ispublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

function currentLocalTimePlusOffset() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offset);
}

newsSchema.pre("save", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.createdAt = currentTime;
  this.updatedAt = currentTime;
  next();
});

newsSchema.pre("findOneAndUpdate", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.set({ updatedAt: currentTime });
  next();
});

const newsmodel = model("news", newsSchema);
export default newsmodel;
