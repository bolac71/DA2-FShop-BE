/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const hashPassword = async (raw: string) => {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(raw, salt);
}
const comparePassword = (raw: string, hashPassword: string) => {
    return bcrypt.compare(raw, hashPassword);
}
function hashKey(prefix: string, obj: any): string {
    const str = JSON.stringify(obj);
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return `${prefix}:${hash}`;
}
export { hashPassword, comparePassword, hashKey }