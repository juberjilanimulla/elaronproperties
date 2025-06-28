import { Schema, model } from "mongoose";

const sellpropertySchema = new Schema(
  {
    propertytype: {
      type: String,
    },
    numberofrooms: [String],
    numberofbathrooms: [String],
    housesurfaceareasqft: String,
    houseyearofconstruction: String,
    houseneighbourhood: String,
    houseaddress: String,
    houseamenities: String,
    firstname: String,
    lastname: String,
    email: String,
    mobile: String,
    description: String,
    images: [
      {
        type: String,
        default: "",
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

function currentLocalTimePlusOffset() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offset);
}

sellpropertySchema.pre("save", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.createdAt = currentTime;
  this.updatedAt = currentTime;
  next();
});

sellpropertySchema.pre("findOneAndUpdate", function (next) {
  const currentTime = currentLocalTimePlusOffset();
  this.set({ updatedAt: currentTime });
  next();
});

const sellpropertymodel = model("sellproperty", sellpropertySchema);
export default sellpropertymodel;
