export async function connect(owner, {writable}) {
  const sdk='https://www.gstatic.com/firebasejs/12.19.0/';
  const [appApi,authApi,dbApi]=await Promise.all([
    import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js'),import(sdk+'firebase-database.js')
  ]);
  const app=appApi.initializeApp(window.BARBER_FIREBASE_CONFIG);
  const auth=authApi.getAuth(app);
  await authApi.setPersistence(auth,authApi.browserSessionPersistence);
  await auth.authStateReady();
  const watch=fn=>authApi.onAuthStateChanged(auth,fn);
  function ownerReference() {
    if(auth.currentUser?.uid!==owner)throw Error('บัญชีปัจจุบันไม่มีสิทธิ์เข้าถึงร้าน');
    return dbApi.ref(dbApi.getDatabase(app),'shops/'+owner);
  }
  return {
    watch,
    login:(email,password)=>authApi.signInWithEmailAndPassword(auth,email,password),
    logout:()=>authApi.signOut(auth),
    reset:email=>authApi.sendPasswordResetEmail(auth,email),
    async read(){return (await dbApi.get(ownerReference())).val();},
    ...(writable?{async transact(update){
      const result=await dbApi.runTransaction(ownerReference(),update,{applyLocally:false});
      if(!result.committed)throw Error('ระบบออนไลน์ยังไม่ยืนยันการซิงก์');
      return result.snapshot.val();
    }}:{})
  };
}
