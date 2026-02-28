import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

export default function PublicRegistration() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({ event_id: '', name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await api.get('/events/public/active');
        setEvents(res.data);
        if (res.data.length > 0) setForm(f => ({ ...f, event_id: res.data[0].id }));
      } catch (err) {
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/participants/register', form);
      const eventName = events.find(ev => ev.id === parseInt(form.event_id))?.name || t('event_name');
      setRegisteredUser({ ...res.data, event_name: eventName });
      toast.success(t('success'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (registeredUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-emerald-500 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <CheckCircle2 className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{t('registration_complete')}</h2>
            <p className="text-emerald-50 text-sm">{t('digital_ticket_ready')}</p>
          </div>
          
          <div className="p-8 text-center">
            <div className="mb-6">
              <h3 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-1">{t('events')}</h3>
              <p className="text-lg font-semibold text-slate-900">{registeredUser.event_name}</p>
            </div>
            <div className="mb-8">
              <h3 className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-1">{t('name')}</h3>
              <p className="text-lg font-semibold text-slate-900">{registeredUser.name}</p>
            </div>
            
            <div className="inline-block p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm mb-6">
              <QRCodeSVG 
                value={registeredUser.qr_code} 
                size={200}
                level="H"
                includeMargin={true}
                className="mx-auto"
              />
            </div>
            
            <p className="text-sm text-slate-500 mb-8">
              {t('screenshot_qr')}
            </p>

            <button
              onClick={() => { setRegisteredUser(null); setForm({ ...form, name: '', email: '' }); }}
              className="text-slate-600 font-medium hover:text-slate-900 transition-colors text-sm"
            >
              {t('register_another')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} /> {t('back_to_login')}
        </button>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('participant_registration')}</h1>
          <p className="text-slate-500 mb-8 text-sm">{t('fill_details')}</p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-center text-sm">
              {t('no_active_events')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('select_event')}</label>
                <select
                  value={form.event_id}
                  onChange={e => setForm({ ...form, event_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm"
                  required
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-2 bg-slate-900 text-white rounded-xl font-medium shadow-sm hover:bg-slate-800 transition-all disabled:opacity-70 flex justify-center items-center h-[52px]"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t('complete_registration')
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
