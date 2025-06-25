import { Schema, model } from "mongoose";

const brochureSchema = new Schema(
  {
    firstname: String,
    lastname: String,
    email: String,
    mobile: String,
    pdf: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, versionKey: false }
);

function currentLocalTimePlusOffset() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offset);
}

brochureSchema.pre("save", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.createdAt = currentTime;
  this.updatedAt = currentTime;
  next();
});

brochureSchema.pre("findOneAndUpdate", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.set({ updatedAt: currentTime });
  next();
});

const brochuremodel = model("brochure", brochureSchema);
export default brochuremodel;
