"""
Scheduler to run retrain.py weekly using APScheduler
"""
from apscheduler.schedulers.background import BackgroundScheduler
import subprocess
import time


def retrain_job():
    subprocess.run(["python", "retrain.py"])

if __name__ == "__main__":
    scheduler = BackgroundScheduler()
    scheduler.add_job(retrain_job, 'interval', weeks=1)
    scheduler.start()
    print("Scheduler started. Retraining will run weekly.")
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
