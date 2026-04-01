import bcrypt from 'bcryptjs';

const hash1 = '$2a$10$WmDj7uXI5RVjx4fAyK9.y.AiwfTWkbzzHyQmuhNv3ADIF3g37Vs0y';
const hash2 = '$2a$10$xzuBVAOFs84FsNRIPL0TmuH9JefYA/FIURkyplF2f.Rx32OSEf.Pi';

const passwords = ['admin', 'password', 'admin123', '123456', 'root', 'sams'];

passwords.forEach(pwd => {
  if (bcrypt.compareSync(pwd, hash1)) {
    console.log(`admin@ttc.ca password is: ${pwd}`);
  }
  if (bcrypt.compareSync(pwd, hash2)) {
    console.log(`admin@sams.local password is: ${pwd}`);
  }
});
