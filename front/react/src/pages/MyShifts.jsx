import { Calendar, Clock, MapPin, CheckCircle } from 'lucide-react';

export default function MyShifts() {
  const myShifts = [
    { hospital: 'St. Jude Medical Center', date: 'Tomorrow, Nov 5', time: '07:00 - 19:00', role: 'ICU Nurse', status: 'Upcoming' },
    { hospital: 'Mercy General Hospital', date: 'Yesterday, Nov 3', time: '19:00 - 07:00', role: 'CCRN Staff', status: 'Completed' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">My Booked Shifts</h2>
        <span className="bg-teal-100 text-teal-800 text-xs px-2.5 py-0.5 rounded-full font-bold">3 Active</span>
      </div>

      <div className="space-y-3">
        {myShifts.map((shift, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${shift.status === 'Upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                  {shift.status}
                </span>
                <h4 className="font-bold text-sm text-gray-800 mt-1">{shift.hospital}</h4>
                <p className="text-xs text-gray-500 font-medium">{shift.role}</p>
              </div>
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {shift.time}</span>
              <span className="font-semibold text-gray-700">{shift.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}