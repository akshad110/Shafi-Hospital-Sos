import { CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';

export default function Applications() {
  const applications = [
    { hospital: 'Mercy General Hospital', role: 'ICU Shift', status: 'Approved', statusColor: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    { hospital: 'Sunrise Hospital', role: 'Telemetry RN', status: 'Under Review', statusColor: 'bg-yellow-100 text-yellow-800', icon: Clock },
    { hospital: 'City Care Clinic', role: 'ER Specialist', status: 'Declined', statusColor: 'bg-red-100 text-red-800', icon: XCircle },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Shift Applications</h2>

      <div className="space-y-3">
        {applications.map((app, idx) => {
          const StatusIcon = app.icon;
          return (
            <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-100 text-gray-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-800">{app.hospital}</h4>
                  <p className="text-[11px] text-gray-400">{app.role}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${app.statusColor}`}>
                <StatusIcon className="w-3 h-3" /> {app.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}