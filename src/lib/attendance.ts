export type ShiftType = 'Non Shift' | 'Shift 1' | 'Shift 2' | 'Shift 3' | 'Shift 4' | 'Unknown';
export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'TAM' | 'TAP' | 'Libur/Tidak Hadir di Kantor';

export interface RawAttendance {
  id?: string | number;
  nama: string;
  tanggal: string;
  absen_masuk: string | null;
  absen_pulang: string | null;
}

export interface AttendanceRecord extends RawAttendance {
  shift: ShiftType;
  status: AttendanceStatus;
}

export const DEFAULT_SHIFT_SETTINGS = {
  'Non Shift': { masuk: '07:45', pulang: '16:50' },
  'Shift 1': { masuk: '06:00', pulang: '15:00' },
  'Shift 2': { masuk: '08:00', pulang: '17:00' },
  'Shift 3': { masuk: '13:00', pulang: '22:00' },
  'Shift 4': { masuk: '22:00', pulang: '07:00' },
  'Unknown': { masuk: '00:00', pulang: '00:00' }
};

function parseTimeMins(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':');
  return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
}

export function isLate(actualTime: string, targetTime: string): boolean {
  if (!actualTime || !targetTime) return false;
  const [h, m] = actualTime.split(':');
  let actualMins = parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
  const targetMins = parseTimeMins(targetTime);
  
  if (targetMins >= 18 * 60 && actualMins < 12 * 60) {
     actualMins += 24 * 60;
  }
  return actualMins > targetMins;
}

export function parseAttendance(
  data: RawAttendance[],
  employeeShifts: Record<string, ShiftType> = {},
  shiftSettings: typeof DEFAULT_SHIFT_SETTINGS = DEFAULT_SHIFT_SETTINGS
): AttendanceRecord[] {
  return data.map((record) => {
    let status: AttendanceStatus = 'Hadir';
    let shift: ShiftType = employeeShifts[record.nama] || 'Non Shift';

    const hasMasuk = !!record.absen_masuk;
    const hasPulang = !!record.absen_pulang;

    if (!hasMasuk && !hasPulang) {
      status = 'Libur/Tidak Hadir di Kantor';
    } else if (!hasMasuk) {
      status = 'TAM';
    } else if (!hasPulang) {
      status = 'TAP';
    } else {
      const targetMasuk = shiftSettings[shift]?.masuk || '07:45';
      if (isLate(record.absen_masuk, targetMasuk)) {
        status = 'Terlambat';
      }
    }

    return {
      ...record,
      shift,
      status,
    };
  });
}
