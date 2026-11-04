import { CheckCircle2, MapPin, Shield, CreditCard, Bell, LogOut, ChevronRight, Edit3 } from 'lucide-react';

export default function Profile() {
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto bg-gray-50 min-h-screen pb-20">
      
      {/* Profile Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150" 
              alt="Sarah Higgins" 
              className="w-14 h-14 rounded-full object-cover border-2 border-teal-500" 
            />
            <div>
              <h2 className="font-bold text-base text-gray-800 flex items-center gap-1">
                Sarah Higgins <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500" />
              </h2>
              <p className="text-xs text-gray-500 font-medium">BSN, RN, CCRN</p>
              <p className="text-[11px] text-teal-600 font-semibold mt-0.5">● ACTIVE STATUS</p>
            </div>
          </div>
          <button className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
          <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Primary Area: Within 35 miles radius (Central Metro)</span>
        </div>
      </div>

      {/* Quick Menu Options */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        
        <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-gray-800">Licenses & Credentials</h4>
              <p className="text-[11px] text-gray-400">RN License, ACLS, Certifications</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>

        <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-gray-800">Payouts & Bank Account</h4>
              <p className="text-[11px] text-gray-400">Chase Checking ending in ****4392</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>

        <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-gray-800">Emergency SOS Notifications</h4>
              <p className="text-[11px] text-gray-400">Instant shift alert settings</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>

      </div>

      {/* Logout Button */}
      <button className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 border border-red-200 transition-colors">
        <LogOut className="w-4 h-4" /> LOG OUT OF HOSPITAL SOS
      </button>

      <p className="text-center text-[10px] text-gray-400 pt-2">
        Hospital SOS Worker v4.8.2 • HIPAA Encrypted
      </p>

    </div>
  );
}