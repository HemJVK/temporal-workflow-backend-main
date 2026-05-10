import { generateSecret, generateURI, verifySync } from 'otplib';
const secret = generateSecret();
const uri = generateURI({ issuer: 'Agent Flow', label: 'test@test.com', secret });
const isValid = verifySync({ secret, token: '123456' }).valid;
console.log(secret, uri, isValid);
