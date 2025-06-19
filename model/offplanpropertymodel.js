import { Schema, model } from "mongoose";

const offplanpropertySchema = new Schema(
  {
    propertyname: {
      type: String,
    },
    startingprice: {
      type: String,
    },
    propertytype: {
      type: String,
    },
    rooms: [String],
    bathrooms: [String],
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    location: {
      type: String,
    },
    brochureurl: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
        default: "",
      },
    ],
    features: [
      {
        title: String,
        description: String,
      },
    ],
    amenities: [String], // e.g. ['Swimming pool', 'Cinema', '24/7 security']
  },
  { timestamps: true, versionKey: false }
);

function currentLocalTimePlusOffset() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offset);
}

offplanpropertySchema.pre("save", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.createdAt = currentTime;
  this.updatedAt = currentTime;
  next();
});

offplanpropertySchema.pre("findOneAndUpdate", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.set({ updatedAt: currentTime });
  next();
});

const offplanpropertymodel = model("offplanproperty", offplanpropertySchema);
export default offplanpropertymodel;
