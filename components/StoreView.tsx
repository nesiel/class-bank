import React, { useState } from 'react';
import { Student, StoreItem, AppConfig } from '../types';
import { ShoppingBag, Coins, ChevronLeft, Check, Lock, Store, Plus, ShoppingCart, Trash2, X, Receipt, Send, Mail, Phone } from 'lucide-react';

interface StoreViewProps {
  students: Student[];
  config: AppConfig;
  onCheckout: () => boolean | undefined;
  cart: StoreItem[];
  setCart: (items: StoreItem[]) => void;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({ 
    students, 
    config, 
    onCheckout,
    cart,
    setCart,
    selectedStudentId,
    setSelectedStudentId
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState<{items: StoreItem[], total: number, prevBalance: number} | null>(null);

  const selectedStudent = selectedStudentId ? students.find(s => s.name === selectedStudentId) : null;

  const handleAddToCart = (item: StoreItem) => {
    if (!selectedStudent) return;
    
    // Check local stock in cart vs real stock
    const inCartCount = cart.filter(i => i.id === item.id).length;
    if (inCartCount >= item.stock) {
        alert("המלאי אזל לפריט זה");
        return;
    }

    setCart([...cart, item]);
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const performCheckout = () => {
    if (!selectedStudent) return;
    
    const prevBalance = selectedStudent.total;
    const items = [...cart];
    const total = cartTotal;

    const success = onCheckout();
    if (success) {
        setIsCartOpen(false);
        setShowReceipt({
            items,
            total,
            prevBalance
        });
    }
  };

  const sendTeacherNotification = () => {
      if (!selectedStudent || !showReceipt) return;
      if (!config.teacherCell) {
          alert("לא מוגדר טלפון מורה בהגדרות");
          return;
      }

      const itemsList = showReceipt.items.map(i => `• ${i.name} (${i.price})`).join('\n');
      const msg = `*אישור רכישה חדש - הבנק הכיתתי* 🛍️\n\nתלמיד/ה: *${selectedStudent.name}*\nסה"כ לתשלום: *${showReceipt.total}₪*\n\nפירוט:\n${itemsList}\n\nתאריך: ${new Date().toLocaleDateString('he-IL')}`;
      
      const cleanPhone = config.teacherCell.startsWith('05') ? '972' + config.teacherCell.substring(1) : config.teacherCell;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendStudentWANotification = () => {
      if (!selectedStudent || !showReceipt) return;
      if (!selectedStudent.studentCell) {
          alert("לא מעודכן טלפון תלמיד");
          return;
      }

      const itemsList = showReceipt.items.map(i => `• ${i.name}`).join('\n');
      const msg = `היי ${selectedStudent.name}, תתחדש/י! 🎉\nרכשת בחנות הכיתתית:\n${itemsList}\n\nהיתרה המעודכנת שלך: ${showReceipt.prevBalance - showReceipt.total}₪`;
      
      const cleanPhone = selectedStudent.studentCell.startsWith('05') ? '972' + selectedStudent.studentCell.substring(1) : selectedStudent.studentCell;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendStudentEmailNotification = () => {
      if (!selectedStudent || !showReceipt) return;
      if (!selectedStudent.studentEmail) {
          alert("לא מעודכן מייל תלמיד");
          return;
      }

      const itemsList = showReceipt.items.map(i => `${i.name}`).join(', ');
      const subject = `קבלה מהחנות הכיתתית - ${selectedStudent.name}`;
      const body = `שלום ${selectedStudent.name},\n\nתודה שרכשת בחנות הכיתתית!\nלהלן פירוט הרכישה שלך:\n${itemsList}\n\nסה"כ נקודות שירדו: ${showReceipt.total}\nיתרה נוכחית: ${showReceipt.prevBalance - showReceipt.total}\n\nתהנה/י!`;

      window.open(`mailto:${selectedStudent.studentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const filteredStudents = students.filter(s => s.name.includes(searchTerm));

  // --- Student Selection View ---
  if (!selectedStudent) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4 bg-card border border-accent/30 p-6 rounded-[1.5rem] text-center shadow-lg">
           <div className="bg-accent/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-accent">
              <Store size={24} />
           </div>
           <h2 className="text-xl font-black text-accent">החנות הכיתתית</h2>
           <p className="text-txt/70 text-xs mt-1 mb-4">בחר תלמיד לקניות</p>
           
           <input 
             type="text" 
             placeholder="חפש תלמיד..." 
             className="w-full bg-black/20 border border-accent/20 rounded-lg px-4 py-2 text-sm text-txt outline-none focus:border-accent transition-colors"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-24">
          {filteredStudents.map(s => (
            <button
              key={s.name}
              onClick={() => setSelectedStudentId(s.name)}
              className="bg-card hover:bg-white/5 p-2 rounded-xl border border-border flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center shadow-sm group"
            >
               <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-white/5 group-hover:border-accent/50 transition-colors">
                  {s.name.charAt(0)}
               </div>
               <span className="font-bold text-[10px] sm:text-xs text-txt truncate w-full">{s.name}</span>
               <span className="text-[10px] font-black text-accent bg-accent/10 px-1.5 rounded-full border border-accent/20">{s.total}₪</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Shopping View (E-commerce Style) ---
  return (
    <div className="h-full flex flex-col relative bg-primary">
      {/* Compact Header */}
      <div className="bg-card border-b border-accent/20 px-4 py-3 shadow-md z-10 sticky top-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <button 
            onClick={() => { setSelectedStudentId(null); setCart([]); }}
            className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
            <ChevronLeft size={18} />
            </button>
            <div>
                <h2 className="text-sm font-black text-white leading-none">{selectedStudent.name}</h2>
                <div className="flex items-center gap-1 text-accent mt-0.5">
                    <Coins size={10} fill="currentColor"/>
                    <span className="text-xs font-bold">{selectedStudent.total} נק'</span>
                </div>
            </div>
        </div>
        
        {/* Cart Summary (Small) */}
        <button 
             onClick={() => cart.length > 0 && setIsCartOpen(true)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${cart.length > 0 ? 'bg-accent text-accent-fg' : 'bg-white/5 text-gray-500'}`}
        >
            <ShoppingCart size={16} />
            {cart.length > 0 && <span className="text-xs font-bold">{cartTotal}</span>}
        </button>
      </div>

      {/* Items Grid - E-commerce Layout */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-32 content-start">
        {config.storeItems.length === 0 && (
            <div className="col-span-3 text-center text-gray-500 py-10">
                <Store size={40} className="mx-auto mb-2 opacity-20"/>
                <span className="text-sm">החנות ריקה.</span>
            </div>
        )}
        
        {config.storeItems.map(item => {
          const inCartCount = cart.filter(c => c.id === item.id).length;
          const remainingStock = item.stock - inCartCount;
          const isOutOfStock = remainingStock <= 0;
          const canAfford = selectedStudent.total >= (cartTotal + item.price);

          return (
            <div 
              key={item.id}
              className={`group relative bg-card rounded-xl border overflow-hidden flex flex-col transition-all duration-300 ${!isOutOfStock ? 'border-border hover:border-accent/50 shadow-sm' : 'border-white/5 opacity-60 grayscale'}`}
            >
               {/* Image Area - Aspect Ratio Square */}
               <div className="aspect-square w-full bg-black/20 flex items-center justify-center overflow-hidden relative">
                   {item.image ? (
                       <img src={item.image} alt={item.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                       <span className="text-3xl drop-shadow-md transform group-hover:scale-110 transition-transform">{item.emoji}</span>
                   )}
                   
                   {/* Stock Badge Overlay */}
                   {isOutOfStock && (
                       <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                           <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">אזל</span>
                       </div>
                   )}
                   {!isOutOfStock && remainingStock < 5 && (
                       <div className="absolute top-1 right-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-500/80 text-white">
                           נותרו {remainingStock}
                       </div>
                   )}
               </div>
               
               {/* Product Info */}
               <div className="p-2 flex flex-col flex-1">
                   <h3 className="font-bold text-txt text-[10px] sm:text-xs leading-tight line-clamp-2 mb-1 h-6">{item.name}</h3>
                   
                   <div className="mt-auto flex items-end justify-between">
                       <span className="text-xs font-black text-accent">{item.price}</span>
                       
                       <button
                        onClick={() => handleAddToCart(item)}
                        disabled={isOutOfStock || !canAfford}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                            !isOutOfStock && canAfford
                            ? 'bg-accent text-accent-fg shadow-md hover:brightness-110' 
                            : 'bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                        >
                            {isOutOfStock || !canAfford ? <Lock size={10}/> : <Plus size={14} />}
                        </button>
                   </div>
               </div>
               
               {/* In Cart Indicator Overlay */}
               {inCartCount > 0 && (
                   <div className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md z-10">
                       {inCartCount}
                   </div>
               )}
            </div>
          );
        })}
      </div>

      {/* Floating Cart (Only if items exist) */}
      {cart.length > 0 && !isCartOpen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-5 fade-in w-11/12 max-w-sm">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-accent text-accent-fg py-3 rounded-2xl shadow-[0_10px_30px_rgba(var(--c-accent),0.4)] flex items-center justify-between px-6 font-bold active:scale-95 transition-transform"
              >
                  <div className="flex items-center gap-3">
                      <div className="bg-black/20 p-1.5 rounded-full">
                        <ShoppingCart size={18} />
                      </div>
                      <span className="text-sm">{cart.length} פריטים</span>
                  </div>
                  <span className="text-lg">{cartTotal} נק'</span>
              </button>
          </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
              <div 
                className="bg-card border-t border-accent/30 rounded-t-[2rem] shadow-2xl flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="p-4 border-b border-border flex justify-between items-center bg-black/10 rounded-t-[2rem]">
                      <div className="flex items-center gap-2">
                          <ShoppingBag className="text-accent"/>
                          <h3 className="font-bold text-lg">העגלה שלך</h3>
                      </div>
                      <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto space-y-3 min-h-[200px]">
                      {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/5 p-2 pr-3 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-black/30 flex items-center justify-center overflow-hidden">
                                      {item.image ? <img src={item.image} className="w-full h-full object-cover"/> : <span className="text-lg">{item.emoji}</span>}
                                  </div>
                                  <span className="font-bold text-sm">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="font-bold text-accent">{item.price}₪</span>
                                  <button onClick={() => handleRemoveFromCart(idx)} className="text-red-500/50 hover:text-red-500 bg-red-500/10 p-1.5 rounded-lg"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="p-6 bg-primary border-t border-border pb-safe">
                      <div className="flex justify-between items-end mb-4">
                          <span className="text-gray-400 text-sm">סה"כ לתשלום:</span>
                          <span className="text-3xl font-black text-accent">{cartTotal}₪</span>
                      </div>
                      <button 
                        onClick={performCheckout}
                        className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"
                      >
                          <Check size={24} /> סיים רכישה
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-300">
           <div className="bg-white text-black w-full max-w-sm rounded-none shadow-2xl relative overflow-hidden flex flex-col items-center p-8 receipt-paper">
              {/* Receipt Visuals */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:16px_16px] -mt-2"></div>
              
              <div className="mb-4 text-center">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2">
                      <Receipt size={24} />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-widest">קבלה</h2>
                  <p className="text-xs text-gray-500">{new Date().toLocaleString('he-IL')}</p>
              </div>

              <div className="w-full border-t-2 border-dashed border-gray-300 my-2"></div>

              <div className="w-full space-y-2 mb-4">
                  {showReceipt.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm font-bold border-b border-gray-100 pb-1 last:border-0">
                          <span>{item.name}</span>
                          <span>{item.price}</span>
                      </div>
                  ))}
              </div>

              <div className="w-full border-t-2 border-black my-2"></div>

              <div className="w-full flex justify-between text-xl font-black mb-6">
                  <span>סה"כ</span>
                  <span>{showReceipt.total}₪</span>
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-2 mb-4">
                  <button 
                    onClick={sendTeacherNotification}
                    className="col-span-2 py-2 bg-green-100 text-green-700 font-bold text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-green-200"
                  >
                      <Send size={14}/> עדכון למורה (וואטסאפ)
                  </button>
                  <button 
                    onClick={sendStudentWANotification}
                    className="py-2 bg-gray-100 text-gray-600 font-bold text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-gray-200"
                  >
                      <Phone size={12}/> תלמיד (WA)
                  </button>
                  <button 
                    onClick={sendStudentEmailNotification}
                    className="py-2 bg-gray-100 text-gray-600 font-bold text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-gray-200"
                  >
                      <Mail size={12}/> תלמיד (Mail)
                  </button>
              </div>

              <button 
                onClick={() => setShowReceipt(null)}
                className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition"
              >
                  סגור
              </button>

              <div className="absolute bottom-0 left-0 right-0 h-4 bg-[radial-gradient(circle,transparent_50%,#fff_50%)] bg-[length:16px_16px] -mb-2 transform rotate-180"></div>
           </div>
        </div>
      )}
    </div>
  );
};