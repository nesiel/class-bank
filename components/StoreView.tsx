
import React, { useState } from 'react';
import { Student, StoreItem, AppConfig, PurchaseRequest, UserRole } from '../types';
import { ShoppingBag, Coins, ChevronLeft, Check, Lock, Store, Plus, ShoppingCart, Trash2, X, Receipt, Send, Mail, Phone, Clock, Box, Edit2, AlertCircle, RefreshCw } from 'lucide-react';

interface StoreViewProps {
  students: Student[];
  config: AppConfig;
  userRole: UserRole;
  loggedInStudentName: string | null;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onUpdateStudent: (student: Student) => void;
  // Legacy/Helper props
  cart: StoreItem[];
  setCart: (items: StoreItem[]) => void;
}

export const StoreView: React.FC<StoreViewProps> = ({ 
    students, 
    config, 
    userRole,
    loggedInStudentName,
    onUpdateConfig,
    onUpdateStudent,
    cart,
    setCart
}) => {
  // Teacher State
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory'>('requests');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Student State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showRequestSuccess, setShowRequestSuccess] = useState(false);

  // --- TEACHER LOGIC ---

  const getAllPendingRequests = () => {
      const allRequests: { student: Student; req: PurchaseRequest; index: number }[] = [];
      students.forEach(student => {
          (student.requests || []).forEach((req, index) => {
              if (req.status === 'pending') {
                  allRequests.push({ student, req, index });
              }
          });
      });
      return allRequests.sort((a, b) => b.req.timestamp - a.req.timestamp);
  };

  const handleApproveRequest = (entry: { student: Student; req: PurchaseRequest; index: number }) => {
      const { student, req, index } = entry;
      const item = config.storeItems.find(i => i.id === req.itemId);
      
      // Validation
      if (!item) return alert("המוצר לא קיים יותר במלאי");
      if (item.stock <= 0) return alert("המלאי אזל למוצר זה");
      if (student.total < req.itemPrice) return alert(`ל${student.name} אין מספיק נקודות (${student.total})`);

      // 1. Deduct Stock
      const updatedStoreItems = config.storeItems.map(i => 
          i.id === item.id ? { ...i, stock: i.stock - 1 } : i
      );
      onUpdateConfig({ ...config, storeItems: updatedStoreItems });

      // 2. Update Student (Deduct points, add purchase, update request status)
      const newTotal = student.total - req.itemPrice;
      
      const newPurchase = {
          id: Date.now().toString(),
          itemId: item.id,
          itemName: item.name,
          cost: req.itemPrice,
          date: new Date().toLocaleDateString('he-IL'),
          timestamp: Date.now()
      };

      const newLog = {
          sub: "חנות",
          teach: "מערכת",
          k: `רכישת ${item.name}`,
          c: 1,
          s: -req.itemPrice,
          d: new Date().toLocaleDateString('he-IL')
      };

      const updatedRequests = [...(student.requests || [])];
      updatedRequests[index] = { ...req, status: 'approved' };

      const updatedStudent: Student = {
          ...student,
          total: newTotal,
          logs: [...student.logs, newLog],
          purchases: [...(student.purchases || []), newPurchase],
          requests: updatedRequests
      };

      onUpdateStudent(updatedStudent);
  };

  const handleRejectRequest = (entry: { student: Student; req: PurchaseRequest; index: number }) => {
      const { student, req, index } = entry;
      const updatedRequests = [...(student.requests || [])];
      updatedRequests[index] = { ...req, status: 'rejected' }; // Or splice to remove
      
      onUpdateStudent({
          ...student,
          requests: updatedRequests
      });
  };

  const handleInventoryUpdate = (id: string, field: keyof StoreItem, value: any) => {
      const updatedItems = config.storeItems.map(item => 
          item.id === id ? { ...item, [field]: value } : item
      );
      onUpdateConfig({ ...config, storeItems: updatedItems });
  };

  const handleDeleteItem = (id: string) => {
      if(window.confirm("למחוק פריט זה?")) {
          onUpdateConfig({ 
              ...config, 
              storeItems: config.storeItems.filter(i => i.id !== id) 
          });
      }
  };

  // --- STUDENT LOGIC ---

  const handleStudentRequest = () => {
      const student = students.find(s => s.name === loggedInStudentName);
      if (!student) return;

      const newRequests: PurchaseRequest[] = cart.map(item => ({
          id: Date.now() + Math.random().toString(),
          itemId: item.id,
          itemName: item.name,
          itemPrice: item.price,
          date: new Date().toLocaleDateString('he-IL'),
          timestamp: Date.now(),
          status: 'pending'
      }));

      onUpdateStudent({
          ...student,
          requests: [...(student.requests || []), ...newRequests]
      });

      setCart([]);
      setIsCartOpen(false);
      setShowRequestSuccess(true);
      setTimeout(() => setShowRequestSuccess(false), 3000);
  };

  // ==========================================
  // RENDER: TEACHER VIEW
  // ==========================================
  if (userRole === 'teacher') {
      const pendingRequests = getAllPendingRequests();

      return (
          <div className="h-full flex flex-col bg-primary text-txt">
              {/* Header */}
              <div className="p-4 bg-card border-b border-accent/20 flex justify-between items-center shadow-md z-10">
                  <div className="flex items-center gap-2">
                      <Store className="text-accent" size={24} />
                      <h2 className="text-xl font-black">ניהול חנות</h2>
                  </div>
                  <div className="flex bg-black/20 p-1 rounded-xl">
                      <button 
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'requests' ? 'bg-accent text-accent-fg shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                          בקשות ({pendingRequests.length})
                      </button>
                      <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'inventory' ? 'bg-accent text-accent-fg shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                          ניהול מלאי
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                  {/* Requests Tab */}
                  {activeTab === 'requests' && (
                      <div className="space-y-3">
                          {pendingRequests.length === 0 ? (
                              <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                  <Check size={48} className="text-green-500 mb-2"/>
                                  <p>אין בקשות ממתינות. הכל טופל!</p>
                              </div>
                          ) : (
                              pendingRequests.map((entry) => (
                                  <div key={entry.req.id} className="bg-card border border-white/10 p-4 rounded-2xl flex justify-between items-center shadow-sm animate-in slide-in-from-right-2">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-white text-lg">{entry.student.name}</span>
                                              <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{entry.req.date}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm text-gray-300">
                                              <span>מבקש/ת לרכוש:</span>
                                              <span className="text-accent font-bold">{entry.req.itemName}</span>
                                              <span className="bg-accent/10 text-accent px-1.5 rounded text-xs font-mono">{entry.req.itemPrice}₪</span>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                              יתרה נוכחית: {entry.student.total}₪ | מלאי נותר: {config.storeItems.find(i => i.id === entry.req.itemId)?.stock || 0}
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleRejectRequest(entry)}
                                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition border border-red-500/20"
                                            title="דחה בקשה"
                                          >
                                              <X size={20} />
                                          </button>
                                          <button 
                                            onClick={() => handleApproveRequest(entry)}
                                            className="p-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition border border-green-500/20 shadow-lg"
                                            title="אשר רכישה"
                                          >
                                              <Check size={20} />
                                          </button>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  )}

                  {/* Inventory Tab */}
                  {activeTab === 'inventory' && (
                      <div className="space-y-4">
                          <button 
                            onClick={() => {
                                const newItem: StoreItem = { id: Date.now().toString(), name: "מוצר חדש", emoji: "📦", price: 0, stock: 0 };
                                onUpdateConfig({ ...config, storeItems: [newItem, ...config.storeItems] });
                                setEditingItemId(newItem.id);
                            }}
                            className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-accent hover:border-accent/50 hover:bg-accent/5 transition flex items-center justify-center gap-2"
                          >
                              <Plus size={18} /> הוסף פריט חדש
                          </button>

                          <div className="grid grid-cols-1 gap-3">
                              {config.storeItems.map(item => (
                                  <div key={item.id} className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-white/5">
                                      <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center text-2xl">
                                          {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-lg"/> : item.emoji}
                                      </div>
                                      
                                      <div className="flex-1 grid grid-cols-2 gap-2">
                                          <div className="col-span-2">
                                              <input 
                                                type="text" 
                                                className="bg-transparent text-white font-bold w-full outline-none border-b border-transparent focus:border-accent text-sm"
                                                value={item.name}
                                                onChange={(e) => handleInventoryUpdate(item.id, 'name', e.target.value)}
                                                placeholder="שם המוצר"
                                              />
                                          </div>
                                          <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
                                              <span className="text-[10px] text-gray-500">מחיר:</span>
                                              <input 
                                                type="number" 
                                                className="bg-transparent text-accent font-mono w-full outline-none text-center font-bold"
                                                value={item.price}
                                                onChange={(e) => handleInventoryUpdate(item.id, 'price', parseInt(e.target.value))}
                                              />
                                          </div>
                                          <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
                                              <span className="text-[10px] text-gray-500">מלאי:</span>
                                              <input 
                                                type="number" 
                                                className={`bg-transparent font-mono w-full outline-none text-center font-bold ${item.stock === 0 ? 'text-red-500' : 'text-white'}`}
                                                value={item.stock}
                                                onChange={(e) => handleInventoryUpdate(item.id, 'stock', parseInt(e.target.value))}
                                              />
                                          </div>
                                      </div>

                                      <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-gray-600 hover:text-red-500 p-2"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // ==========================================
  // RENDER: STUDENT VIEW (REQUEST MODE)
  // ==========================================
  
  const student = students.find(s => s.name === loggedInStudentName);
  if (!student) return <div className="p-10 text-center">התחבר כתלמיד לצפייה בחנות</div>;

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const pendingRequestsCount = (student.requests || []).filter(r => r.status === 'pending').length;

  return (
    <div className="h-full flex flex-col relative bg-primary">
      {/* Student Header */}
      <div className="bg-card border-b border-accent/20 px-4 py-3 shadow-md z-10 sticky top-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div>
                <h2 className="text-sm font-black text-white leading-none">החנות הכיתתית</h2>
                <div className="flex items-center gap-1 text-accent mt-0.5">
                    <Coins size={10} fill="currentColor"/>
                    <span className="text-xs font-bold">היתרה שלך: {student.total} נק'</span>
                </div>
            </div>
        </div>
        
        {/* Cart Summary */}
        <div className="flex gap-2">
            {pendingRequestsCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-500 rounded-full text-[10px] font-bold border border-orange-500/30">
                    <Clock size={10} />
                    {pendingRequestsCount} בקשות
                </div>
            )}
            <button 
                onClick={() => cart.length > 0 && setIsCartOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${cart.length > 0 ? 'bg-accent text-accent-fg' : 'bg-white/5 text-gray-500'}`}
            >
                <ShoppingCart size={16} />
                {cart.length > 0 && <span className="text-xs font-bold">{cartTotal}</span>}
            </button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-32 content-start">
        {config.storeItems.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-10">
                <Store size={40} className="mx-auto mb-2 opacity-20"/>
                <span className="text-sm">החנות ריקה כרגע.</span>
            </div>
        )}
        
        {config.storeItems.map(item => {
          const inCartCount = cart.filter(c => c.id === item.id).length;
          const remainingStock = item.stock - inCartCount;
          const isOutOfStock = remainingStock <= 0;
          const canAfford = student.total >= (cartTotal + item.price);

          return (
            <div 
              key={item.id}
              className={`group relative bg-card rounded-xl border overflow-hidden flex flex-col transition-all duration-300 ${!isOutOfStock ? 'border-border hover:border-accent/50 shadow-sm' : 'border-white/5 opacity-60 grayscale'}`}
            >
               {/* Image Area */}
               <div className="aspect-square w-full bg-black/20 flex items-center justify-center overflow-hidden relative">
                   {item.image ? (
                       <img src={item.image} alt={item.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                       <span className="text-4xl drop-shadow-md transform group-hover:scale-110 transition-transform">{item.emoji}</span>
                   )}
                   
                   {isOutOfStock && (
                       <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                           <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">אזל המלאי</span>
                       </div>
                   )}
               </div>
               
               {/* Product Info */}
               <div className="p-3 flex flex-col flex-1">
                   <h3 className="font-bold text-white text-xs leading-tight line-clamp-2 mb-2 h-8">{item.name}</h3>
                   
                   <div className="mt-auto flex items-center justify-between">
                       <span className="text-sm font-black text-accent">{item.price}</span>
                       
                       <button
                        onClick={() => setCart([...cart, item])}
                        disabled={isOutOfStock || !canAfford}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                            !isOutOfStock && canAfford
                            ? 'bg-accent text-accent-fg shadow-md hover:brightness-110' 
                            : 'bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                        >
                            {isOutOfStock || !canAfford ? <Lock size={12}/> : <Plus size={16} />}
                        </button>
                   </div>
               </div>
               
               {inCartCount > 0 && (
                   <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10 animate-bounce">
                       {inCartCount}
                   </div>
               )}
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
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

      {/* Success Message Overlay */}
      {showRequestSuccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-card p-8 rounded-3xl border border-green-500/50 text-center shadow-2xl transform scale-110">
                  <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <Check size={32} strokeWidth={4} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">הבקשה נשלחה!</h3>
                  <p className="text-gray-400 text-sm">המורה יאשר את הרכישה בקרוב.</p>
              </div>
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
                                  <span className="font-bold text-sm text-white">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="font-bold text-accent">{item.price}₪</span>
                                  <button 
                                    onClick={() => {
                                        const newCart = [...cart];
                                        newCart.splice(idx, 1);
                                        setCart(newCart);
                                    }} 
                                    className="text-red-500/50 hover:text-red-500 bg-red-500/10 p-1.5 rounded-lg"
                                  >
                                      <Trash2 size={14}/>
                                  </button>
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
                        onClick={handleStudentRequest}
                        className="w-full py-4 bg-gradient-to-r from-accent to-yellow-600 text-black font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"
                      >
                          <Send size={20} /> שלח בקשה למורה
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
