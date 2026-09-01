import json, math
from pathlib import Path

def cp(k,n,alpha=0.05):
    from scipy.stats import beta
    lo=0.0 if k==0 else beta.ppf(alpha/2,k,n-k+1)
    hi=1.0 if k==n else beta.ppf(1-alpha/2,k+1,n-k)
    return lo,hi

pairs={'action':(12,15),'object':(8,15),'iogp':(8,14)}
for name,(k,n) in pairs.items():
    lo,hi=cp(k,n)
    print(f'{name}: {k}/{n} = {k/n:.4f}; exact 95% CI = {lo:.4f} to {hi:.4f}')
print('CERTIFIED ACCURACY: NOT ESTABLISHED')
