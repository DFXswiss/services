import { HolderUserData } from 'src/dto/realunit.dto';

function trimmed(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const text = value.trim();
  if (text === '') return undefined;
  return text;
}

function personName(firstname: string | null | undefined, surname: string | null | undefined): string | undefined {
  const parts: string[] = [];
  const first = trimmed(firstname);
  const last = trimmed(surname);
  if (first !== undefined) parts.push(first);
  if (last !== undefined) parts.push(last);
  if (parts.length === 0) return undefined;
  return parts.join(' ');
}

function displayName(userData: HolderUserData): string | undefined {
  const verifiedName = trimmed(userData.verifiedName);
  if (verifiedName !== undefined) return verifiedName;
  const person = personName(userData.firstname, userData.surname);
  if (person !== undefined) return person;
  return trimmed(userData.organizationName);
}

export function holderUserDataLines(userData: HolderUserData | null): { primary: string; secondary?: string } {
  if (userData == null) {
    return { primary: '\u2014' };
  }

  const name = displayName(userData);
  const mail = trimmed(userData.mail);

  if (name !== undefined && mail !== undefined) {
    return { primary: name, secondary: mail };
  }
  if (name !== undefined) {
    return { primary: name };
  }
  if (mail !== undefined) {
    return { primary: `#${userData.id}`, secondary: mail };
  }
  return { primary: `#${userData.id}` };
}
