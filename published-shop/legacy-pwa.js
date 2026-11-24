if(location.origin==='https://soraluasom-commits.github.io' &&
   location.pathname.startsWith('/barber-manager-v2/') && 'serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{
    // Browser can still use the online shop when installation fails.
  });
}
