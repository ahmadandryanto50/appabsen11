/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToastMessage } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgStyle = 'bg-blue-50 border-blue-200 text-blue-800';
        let IconComponent = Info;
        let iconColor = 'text-blue-600';

        if (toast.type === 'success') {
          bgStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800';
          IconComponent = CheckCircle;
          iconColor = 'text-emerald-600';
        } else if (toast.type === 'error') {
          bgStyle = 'bg-rose-50 border-rose-200 text-rose-800';
          IconComponent = XCircle;
          iconColor = 'text-rose-600';
        } else if (toast.type === 'warning') {
          bgStyle = 'bg-amber-50 border-amber-200 text-amber-800';
          IconComponent = AlertTriangle;
          iconColor = 'text-amber-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-sm font-medium flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${bgStyle}`}
          >
            <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
            <div className="flex-1 text-slate-700">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
