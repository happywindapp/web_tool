#pragma once
#include <map>
#include <optional>
template<typename K,typename V>
class Cache{
  std::map<K,V> items_;
  std::size_t limit_;
public:
  Cache(std::size_t limit):limit_(limit){}
  std::optional<V> get(const K& k)const{auto it=items_.find(k);if(it==items_.end())return std::nullopt;return it->second;}
  void put(const K& k,V v){if(items_.size()>=limit_&&!items_.count(k)){items_.erase(items_.begin());}items_[k]=std::move(v);}
  // a very long expression to make the formatter wrap the arguments onto several lines for sure
  static bool same(const Cache& a,const Cache& b){return a.limit_==b.limit_&&a.items_.size()==b.items_.size()&&a.items_==b.items_;}
};
enum class Side{Buy,Sell};
switch_case_test: ;
