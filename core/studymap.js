
window.StudyMap = {
  query(name){
    return new URLSearchParams(location.search).get(name);
  },
  go(url){ location.href = url; },
  rememberLast(url){
    try{ localStorage.setItem("studymap_last", url); }catch(e){}
  }
};
