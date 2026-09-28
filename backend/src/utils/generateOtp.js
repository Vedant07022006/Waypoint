import { randomInt } from "crypto";

const generateOtp = () => {
    return randomInt(100000, 1000000).toString();
};

export default generateOtp;